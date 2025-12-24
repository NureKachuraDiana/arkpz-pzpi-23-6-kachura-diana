import axiosInstance from './axios.instance';
import type {
  // Auth
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  // Backup
  CreateBackupRequest,
  Backup,
  BackupStats,
  BackupStatus,
  // Data Export
  CreateExportRequest,
  Export,
  // Maintenance
  CreateMaintenanceScheduleRequest,
  UpdateMaintenanceScheduleRequest,
  AssignMaintenanceRequest,
  CompleteMaintenanceRequest,
  MaintenanceSchedule,
  // Monitoring Station
  CreateMonitoringStationRequest,
  UpdateMonitoringStationRequest,
  GetMonitoringStationInRadiusRequest,
  MonitoringStation,
  StationStats,
  StationHealth,
  // Sensor
  CreateSensorRequest,
  UpdateSensorRequest,
  Sensor,
  SensorType,
  SensorStatusInfo,
  // Notification
  CreateNotificationRequest,
  CreateNotificationFromTemplateRequest,
  MarkAsReadRequest,
  Notification,
  CreateNotificationTemplateRequest,
  UpdateNotificationTemplateRequest,
  NotificationTemplate,
  // Sensor Readings
  GetReadingsQuery,
  AggregationQuery,
  SensorReading,
  AggregatedData,
  DataQualityReport,
  // Settings
  Settings,
  UpdateSettingsRequest,
  // Station Alert
  GetAlertsQuery,
  ClearHistoryRequest,
  StationAlert,
  // System
  CreateSystemEventRequest,
  SystemEvent,
  SystemEventType,
  SystemEventSource,
  SystemEventSummary,
  SystemHealth,
  SystemStatistics,
  DashboardData,
  // Threshold
  CreateThresholdRequest,
  UpdateThresholdRequest,
  Threshold,
  ValidateReadingResponse,
  // User
  ChangeUserRoleRequest,
  UpdateProfileRequest,
  // User Activity Log
  CreateUserActivityLogRequest,
  UserActivityLog,
} from './types';

/**
 * Centralized API service for all backend API calls
 * Provides strongly-typed methods for all API endpoints
 */
class ApiService {
  // ============================================================================
  // Auth API
  // ============================================================================

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginRequest;

    if (!email || !password) {
      throw new Error('Email or password not provided');
    }

    const response = await axiosInstance.post<AuthResponse>('/auth/login', loginRequest);
    return response.data;
  }

  async register(registerRequest: RegisterRequest): Promise<AuthResponse> {
    const { email, password } = registerRequest;

    if (!email || !password) {
      throw new Error('Email or password not provided');
    }

    const response = await axiosInstance.post<AuthResponse>('/auth/registration', registerRequest);
    return response.data;
  }

  async logout(): Promise<{ message?: string }> {
    const response = await axiosInstance.post<{ message?: string }>('/auth/logout');
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await axiosInstance.get<User>('/auth/me');
    return response.data;
  }

  // ============================================================================
  // Backup API
  // ============================================================================

  async createBackup(createBackupRequest: CreateBackupRequest): Promise<Backup> {
    const { type } = createBackupRequest;

    if (type && !['database', 'full'].includes(type)) {
      throw new Error("Invalid backup type. Must be 'database' or 'full'");
    }

    const response = await axiosInstance.post<any>('/backup', createBackupRequest);
    // Convert server response to client Backup type
    return {
      ...response.data,
      id: String(response.data.id),
      type: type || (response.data.fileName?.includes('full-backup') ? 'full' : 'database'),
      error: response.data.errorMessage || response.data.error,
    };
  }

  async listBackups(
    skip?: number | null,
    take?: number | null,
    status?: BackupStatus
  ): Promise<Backup[]> {
    const params: Record<string, unknown> = {};
    if (skip !== undefined && skip !== null) params.skip = skip;
    if (take !== undefined && take !== null) params.take = take;
    if (status) params.status = status;

    const response = await axiosInstance.get<any[]>('/backup', { params });
    // Convert server response to client Backup type
    return response.data.map((backup: any) => ({
      ...backup,
      id: String(backup.id),
      // Infer type from fileName if not present
      type: backup.type || (backup.fileName?.includes('full-backup') ? 'full' : 'database'),
      error: backup.errorMessage || backup.error,
    }));
  }

  async getBackup(id: string): Promise<Backup> {
    if (!id) {
      throw new Error('Backup ID not provided');
    }

    const response = await axiosInstance.get<any>(`/backup/${id}`);
    // Convert server response to client Backup type
    return {
      ...response.data,
      id: String(response.data.id),
      type: response.data.type || (response.data.fileName?.includes('full-backup') ? 'full' : 'database'),
      error: response.data.errorMessage || response.data.error,
    };
  }

  async downloadBackup(id: string): Promise<Blob> {
    if (!id) {
      throw new Error('Backup ID not provided');
    }

    const response = await axiosInstance.get<Blob>(`/backup/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteBackup(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Backup ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/backup/${id}`);
    return response.data;
  }

  async cancelBackup(id: string): Promise<Backup> {
    if (!id) {
      throw new Error('Backup ID not provided');
    }

    const response = await axiosInstance.post<any>(`/backup/${id}/cancel`);
    // Convert server response to client Backup type
    return {
      ...response.data,
      id: String(response.data.id),
      type: response.data.type || (response.data.fileName?.includes('full-backup') ? 'full' : 'database'),
      error: response.data.errorMessage || response.data.error,
    };
  }

  async getBackupStats(): Promise<BackupStats> {
    const response = await axiosInstance.get<any>('/backup/stats/summary');
    // Convert server response to client BackupStats type
    return {
      total: response.data.total || 0,
      completed: response.data.completed || 0,
      failed: response.data.failed || 0,
      pending: response.data.pending || 0,
      totalSize: response.data.totalSizeMB || response.data.totalSize || 0,
    };
  }

  // ============================================================================
  // Data Export API
  // ============================================================================

  async createExport(createExportRequest: CreateExportRequest): Promise<Export> {
    const { format, filters } = createExportRequest;

    if (!format) {
      throw new Error('Export format not provided');
    }

    if (!filters) {
      throw new Error('Export filters not provided');
    }

    const response = await axiosInstance.post<Export>('/data-exports', createExportRequest);
    return response.data;
  }

  async getUserExports(page?: number | null, limit?: number | null): Promise<Export[]> {
    const params: Record<string, unknown> = {};
    if (page !== undefined && page !== null) params.page = page;
    if (limit !== undefined && limit !== null) params.limit = limit;

    const response = await axiosInstance.get<Export[]>('/data-exports', { params });
    return response.data;
  }

  async getExportById(id: string): Promise<Export> {
    if (!id) {
      throw new Error('Export ID not provided');
    }

    const response = await axiosInstance.get<Export>(`/data-exports/${id}`);
    return response.data;
  }

  async downloadExport(id: string): Promise<Blob> {
    if (!id) {
      throw new Error('Export ID not provided');
    }

    const response = await axiosInstance.get<Blob>(`/data-exports/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async cancelExport(id: string): Promise<Export> {
    if (!id) {
      throw new Error('Export ID not provided');
    }

    const response = await axiosInstance.post<Export>(`/data-exports/${id}/cancel`);
    return response.data;
  }

  async deleteExport(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Export ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/data-exports/${id}`);
    return response.data;
  }

  async cleanupOldExports(days?: number | null): Promise<{ message?: string }> {
    const params: Record<string, unknown> = {};
    if (days !== undefined && days !== null) params.days = days;

    const response = await axiosInstance.post<{ message?: string }>(
      '/data-exports/admin/cleanup',
      null,
      { params }
    );
    return response.data;
  }

  // ============================================================================
  // Maintenance API
  // ============================================================================

  async createMaintenanceSchedule(
    createMaintenanceScheduleRequest: CreateMaintenanceScheduleRequest
  ): Promise<MaintenanceSchedule> {
    const { title, scheduleType, startDate, assignedTo, stationId, sensorId, endDate, description } = createMaintenanceScheduleRequest;

    if (!title) {
      throw new Error('Maintenance title not provided');
    }

    if (!scheduleType) {
      throw new Error('Schedule type not provided');
    }

    if (!startDate) {
      throw new Error('Start date not provided');
    }

    // Convert scheduleType from client format to server format
    const scheduleTypeMap: Record<string, string> = {
      'one-time': 'ONE_TIME',
      'daily': 'DAILY',
      'weekly': 'WEEKLY',
      'monthly': 'MONTHLY',
      'yearly': 'MONTHLY', // Server doesn't support YEARLY, using MONTHLY as fallback
    };
    const serverScheduleType = scheduleTypeMap[scheduleType] || scheduleType.toUpperCase().replace('-', '_');

    // Prepare request body for server
    const requestBody: any = {
      title,
      scheduleType: serverScheduleType,
      startDate: new Date(startDate),
      ...(description && { description }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(stationId && { stationId: Number(stationId) }),
      ...(sensorId && { sensorId: Number(sensorId) }),
      ...(assignedTo && { assignedTo: Number(assignedTo) }),
    };

    const response = await axiosInstance.post<MaintenanceSchedule>(
      '/maintenance-schedules',
      requestBody
    );
    return response.data;
  }

  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    const response = await axiosInstance.get<MaintenanceSchedule[]>('/maintenance-schedules');
    return response.data;
  }

  async getUpcomingMaintenanceForUser(
    userId: string,
    days?: number | null
  ): Promise<MaintenanceSchedule[]> {
    if (!userId) {
      throw new Error('User ID not provided');
    }

    const params: Record<string, unknown> = {};
    if (days !== undefined && days !== null) params.days = days;

    const response = await axiosInstance.get<MaintenanceSchedule[]>(
      `/maintenance-schedules/upcoming/${userId}`,
      { params }
    );
    return response.data;
  }

  async getMaintenanceScheduleById(id: string): Promise<MaintenanceSchedule> {
    if (!id) {
      throw new Error('Maintenance schedule ID not provided');
    }

    const response = await axiosInstance.get<MaintenanceSchedule>(
      `/maintenance-schedules/${id}`
    );
    return response.data;
  }

  async updateMaintenanceSchedule(
    id: string,
    updateMaintenanceScheduleRequest: UpdateMaintenanceScheduleRequest
  ): Promise<MaintenanceSchedule> {
    if (!id) {
      throw new Error('Maintenance schedule ID not provided');
    }

    const { scheduleType, startDate, endDate, assignedTo, stationId, sensorId, title, description } = updateMaintenanceScheduleRequest;

    // Prepare request body for server
    const requestBody: any = {};

    if (title !== undefined) requestBody.title = title;
    if (description !== undefined) requestBody.description = description;
    if (startDate !== undefined) requestBody.startDate = new Date(startDate);
    if (endDate !== undefined) requestBody.endDate = endDate ? new Date(endDate) : null;
    // Handle stationId: if explicitly set to undefined/null, send null to clear; if number, send number
    if (stationId !== undefined) requestBody.stationId = stationId !== null && stationId !== undefined ? Number(stationId) : null;
    // Handle sensorId: if explicitly set to undefined/null, send null to clear; if number, send number
    if (sensorId !== undefined) requestBody.sensorId = sensorId !== null && sensorId !== undefined ? Number(sensorId) : null;
    // Handle assignedTo: if string is provided, convert to number; if empty/null, send null to clear
    if (assignedTo !== undefined) requestBody.assignedTo = assignedTo && assignedTo !== "" ? Number(assignedTo) : null;

    // Convert scheduleType from client format to server format if provided
    if (scheduleType !== undefined) {
      const scheduleTypeMap: Record<string, string> = {
        'one-time': 'ONE_TIME',
        'daily': 'DAILY',
        'weekly': 'WEEKLY',
        'monthly': 'MONTHLY',
        'yearly': 'MONTHLY', // Server doesn't support YEARLY, using MONTHLY as fallback
      };
      requestBody.scheduleType = scheduleTypeMap[scheduleType] || scheduleType.toUpperCase().replace('-', '_');
    }

    const response = await axiosInstance.put<MaintenanceSchedule>(
      `/maintenance-schedules/${id}`,
      requestBody
    );
    return response.data;
  }

  async deleteMaintenanceSchedule(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Maintenance schedule ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(
      `/maintenance-schedules/${id}`
    );
    return response.data;
  }

  async assignMaintenance(
    id: string,
    assignMaintenanceRequest: AssignMaintenanceRequest
  ): Promise<MaintenanceSchedule> {
    if (!id) {
      throw new Error('Maintenance schedule ID not provided');
    }

    const { assignedTo } = assignMaintenanceRequest;

    if (!assignedTo) {
      throw new Error('Assigned user ID not provided');
    }

    // Convert assignedTo from string to number for server
    const requestBody = {
      assignedTo: Number(assignedTo),
    };

    const response = await axiosInstance.patch<MaintenanceSchedule>(
      `/maintenance-schedules/${id}/assign`,
      requestBody
    );
    return response.data;
  }

  async completeMaintenance(
    id: string,
    completeMaintenanceRequest: CompleteMaintenanceRequest
  ): Promise<MaintenanceSchedule> {
    if (!id) {
      throw new Error('Maintenance schedule ID not provided');
    }

    const response = await axiosInstance.patch<MaintenanceSchedule>(
      `/maintenance-schedules/${id}/complete`,
      completeMaintenanceRequest
    );
    return response.data;
  }

  async checkUpcomingMaintenance(): Promise<{ message?: string }> {
    const response = await axiosInstance.post<{ message?: string }>(
      '/maintenance-schedules/check-upcoming'
    );
    return response.data;
  }

  // ============================================================================
  // Monitoring Station API
  // ============================================================================

  async createMonitoringStation(
    createMonitoringStationRequest: CreateMonitoringStationRequest
  ): Promise<MonitoringStation> {
    const { name, latitude, longitude } = createMonitoringStationRequest;

    if (!name) {
      throw new Error('Monitoring station name not provided');
    }

    if (latitude === null || latitude === undefined) {
      throw new Error('Latitude not provided');
    }

    if (longitude === null || longitude === undefined) {
      throw new Error('Longitude not provided');
    }

    const response = await axiosInstance.post<MonitoringStation>(
      '/monitoring-station',
      createMonitoringStationRequest
    );
    return response.data;
  }

  async getAllMonitoringStations(): Promise<MonitoringStation[]> {
    console.log("API: Requesting all monitoring stations from /monitoring-station");
    try {
      const response = await axiosInstance.get<any[]>('/monitoring-station');
      console.log("API: Response received:", response.status, response.data?.length || 0, "stations");
      console.log("API: Raw response data:", response.data);
      
      // Transform backend data (id as number) to frontend format (id as string)
      const stations: MonitoringStation[] = (response.data || []).map((station: any) => ({
        ...station,
        id: String(station.id), // Convert number ID to string
        createdAt: station.createdAt ? new Date(station.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: station.updatedAt ? new Date(station.updatedAt).toISOString() : new Date().toISOString(),
      }));
      
      console.log("API: Transformed stations:", stations);
      return stations;
    } catch (error) {
      console.error("API: Error fetching monitoring stations:", error);
      throw error;
    }
  }

  async getMonitoringStationById(id: string): Promise<MonitoringStation> {
    if (!id) {
      throw new Error('Monitoring station ID not provided');
    }

    const response = await axiosInstance.get<MonitoringStation>(`/monitoring-station/${id}`);
    return response.data;
  }

  async updateMonitoringStation(
    id: string,
    updateMonitoringStationRequest: UpdateMonitoringStationRequest
  ): Promise<MonitoringStation> {
    if (!id) {
      throw new Error('Monitoring station ID not provided');
    }

    const response = await axiosInstance.patch<MonitoringStation>(
      `/monitoring-station/${id}`,
      updateMonitoringStationRequest
    );
    return response.data;
  }

  async deleteMonitoringStation(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Monitoring station ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/monitoring-station/${id}`);
    return response.data;
  }

  async deactivateMonitoringStation(id: string): Promise<MonitoringStation> {
    if (!id) {
      throw new Error('Monitoring station ID not provided');
    }

    const response = await axiosInstance.patch<MonitoringStation>(
      `/monitoring-station/deactivate/${id}`
    );
    return response.data;
  }

  async activateMonitoringStation(id: string): Promise<MonitoringStation> {
    if (!id) {
      throw new Error('Monitoring station ID not provided');
    }

    const response = await axiosInstance.patch<MonitoringStation>(
      `/monitoring-station/activate/${id}`
    );
    return response.data;
  }

  async findMonitoringStationsInRadius(
    getMonitoringStationInRadiusRequest: GetMonitoringStationInRadiusRequest
  ): Promise<MonitoringStation[]> {
    const { latitude, longitude, radius } = getMonitoringStationInRadiusRequest;

    if (latitude === null || latitude === undefined) {
      throw new Error('Latitude not provided');
    }

    if (longitude === null || longitude === undefined) {
      throw new Error('Longitude not provided');
    }

    if (radius === null || radius === undefined) {
      throw new Error('Radius not provided');
    }

    // Note: Server uses GET with @Body(), which is non-standard HTTP
    // Axios doesn't support body in GET requests, so using POST as workaround
    const response = await axiosInstance.post<MonitoringStation[]>(
      '/monitoring-station/radius',
      getMonitoringStationInRadiusRequest
    );
    return response.data;
  }

  // ============================================================================
  // Monitoring Station Stats API
  // ============================================================================

  async getStationStats(stationId: string): Promise<StationStats> {
    if (!stationId) {
      throw new Error('Station ID not provided');
    }

    const response = await axiosInstance.get<StationStats>(
      `/monitoring-station-stats/${stationId}`
    );
    return response.data;
  }

  async getSensorTypeStats(stationId: string, sensorType: SensorType): Promise<StationStats> {
    if (!stationId) {
      throw new Error('Station ID not provided');
    }

    if (!sensorType) {
      throw new Error('Sensor type not provided');
    }

    const response = await axiosInstance.get<StationStats>(
      `/monitoring-station-stats/${stationId}/sensor-type/${sensorType}`
    );
    return response.data;
  }

  async getStationHealth(stationId: string): Promise<StationHealth> {
    if (!stationId) {
      throw new Error('Station ID not provided');
    }

    const response = await axiosInstance.get<StationHealth>(
      `/monitoring-station-stats/health/${stationId}`
    );
    return response.data;
  }

  // ============================================================================
  // Sensor API
  // ============================================================================

  async createSensor(createSensorRequest: CreateSensorRequest): Promise<Sensor> {
    const { stationId, type, name, serialNumber } = createSensorRequest;

    if (!stationId) {
      throw new Error('Station ID not provided');
    }

    if (!type) {
      throw new Error('Sensor type not provided');
    }

    if (!name) {
      throw new Error('Sensor name not provided');
    }

    if (!serialNumber) {
      throw new Error('Serial number not provided');
    }

    // Transform data for backend:
    // 1. Convert stationId from string to number
    // 2. Convert sensor type from lowercase to UPPERCASE (matching Prisma enum)
    const typeMapping: Record<string, string> = {
      'temperature': 'TEMPERATURE',
      'humidity': 'HUMIDITY',
      'pressure': 'PRESSURE',
      'air_quality': 'AIR_QUALITY',
      'co2': 'CO2',
      'noise': 'NOISE',
      'pm2_5': 'PM2_5',
      'pm10': 'PM10',
      'water_quality': 'WATER_QUALITY',
    };

    const transformedRequest = {
      ...createSensorRequest,
      stationId: parseInt(stationId, 10),
      type: typeMapping[type] || type.toUpperCase().replace(/-/g, '_'),
    };

    const response = await axiosInstance.post<Sensor>('/sensors', transformedRequest);
    return response.data;
  }

  async getSensorsInStation(stationId: string): Promise<Sensor[]> {
    if (!stationId) {
      throw new Error('Station ID not provided');
    }

    const response = await axiosInstance.get<Sensor[]>(`/sensors/station/${stationId}`);
    return response.data;
  }

  async getAllSensors(): Promise<Sensor[]> {
    const response = await axiosInstance.get<Sensor[]>('/sensors');
    return response.data;
  }

  async getSensorsByType(type: SensorType): Promise<Sensor[]> {
    if (!type) {
      throw new Error('Sensor type not provided');
    }

    const response = await axiosInstance.get<Sensor[]>(`/sensors/type/${type}`);
    return response.data;
  }

  async activateSensor(id: string): Promise<Sensor> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.patch<Sensor>(`/sensors/${id}/activate`);
    return response.data;
  }

  async deactivateSensor(id: string): Promise<Sensor> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.patch<Sensor>(`/sensors/${id}/deactivate`);
    return response.data;
  }

  async calibrateSensor(id: string): Promise<Sensor> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.put<Sensor>(`/sensors/${id}/calibrate`);
    return response.data;
  }

  async getSensorStatus(id: string): Promise<SensorStatusInfo> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.get<SensorStatusInfo>(`/sensors/${id}/status/latest`);
    return response.data;
  }

  async getSensorStatusHistory(id: string): Promise<SensorStatusInfo[]> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.get<SensorStatusInfo[]>(`/sensors/${id}/status/history`);
    return response.data;
  }

  async getSensorById(id: string): Promise<Sensor> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.get<Sensor>(`/sensors/${id}`);
    return response.data;
  }

  async updateSensor(id: string, updateSensorRequest: UpdateSensorRequest): Promise<Sensor> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.patch<Sensor>(`/sensors/${id}`, updateSensorRequest);
    return response.data;
  }

  async deleteSensor(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Sensor ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/sensors/${id}`);
    return response.data;
  }

  // ============================================================================
  // Notification Template API
  // ============================================================================

  async createNotificationTemplate(
    createNotificationTemplateRequest: CreateNotificationTemplateRequest
  ): Promise<NotificationTemplate> {
    const { type, language, title, message } = createNotificationTemplateRequest;

    if (!type) {
      throw new Error('Notification type not provided');
    }

    if (!language) {
      throw new Error('Language not provided');
    }

    if (!title) {
      throw new Error('Template title not provided');
    }

    if (!message) {
      throw new Error('Template message not provided');
    }

    // Convert client notification type to server format
    const notificationTypeMap: Record<string, string> = {
      'alert': 'ALERT',
      'warning': 'WARNING',
      'info': 'INFO',
      'system': 'SYSTEM',
      'maintenance': 'SYSTEM',
      'threshold_exceeded': 'ALERT',
    };

    const serverType = notificationTypeMap[type] || type.toUpperCase();

    const requestBody = {
      type: serverType,
      language,
      title: title.trim(),
      message: message.trim(),
    };

    const response = await axiosInstance.post<NotificationTemplate>(
      '/notification-templates',
      requestBody
    );
    
    // Convert server response type back to client format
    const serverToClientTypeMap: Record<string, string> = {
      'ALERT': 'alert',
      'WARNING': 'warning',
      'INFO': 'info',
      'SYSTEM': 'system',
    };

    return {
      ...response.data,
      type: (serverToClientTypeMap[response.data.type] || response.data.type.toLowerCase()) as any,
    };
  }

  async getAllNotificationTemplates(): Promise<NotificationTemplate[]> {
    const response = await axiosInstance.get<NotificationTemplate[]>('/notification-templates');
    
    // Convert server response types back to client format
    const serverToClientTypeMap: Record<string, string> = {
      'ALERT': 'alert',
      'WARNING': 'warning',
      'INFO': 'info',
      'SYSTEM': 'system',
    };

    return response.data.map(template => ({
      ...template,
      type: (serverToClientTypeMap[template.type] || template.type.toLowerCase()) as any,
    }));
  }

  async getNotificationTemplateById(id: string): Promise<NotificationTemplate> {
    if (!id) {
      throw new Error('Template ID not provided');
    }

    const response = await axiosInstance.get<NotificationTemplate>(
      `/notification-templates/${id}`
    );
    
    // Convert server response type back to client format
    const serverToClientTypeMap: Record<string, string> = {
      'ALERT': 'alert',
      'WARNING': 'warning',
      'INFO': 'info',
      'SYSTEM': 'system',
    };

    return {
      ...response.data,
      type: (serverToClientTypeMap[response.data.type] || response.data.type.toLowerCase()) as any,
    };
  }

  async updateNotificationTemplate(
    type: string,
    language: string,
    updateNotificationTemplateRequest: UpdateNotificationTemplateRequest
  ): Promise<NotificationTemplate> {
    if (!type) {
      throw new Error('Notification type not provided');
    }

    if (!language) {
      throw new Error('Language not provided');
    }

    const requestBody: any = {};
    if (updateNotificationTemplateRequest.title !== undefined) {
      requestBody.title = updateNotificationTemplateRequest.title.trim();
    }
    if (updateNotificationTemplateRequest.message !== undefined) {
      requestBody.message = updateNotificationTemplateRequest.message.trim();
    }

    const response = await axiosInstance.put<NotificationTemplate>(
      `/notification-templates/${type}/${language}`,
      requestBody
    );
    
    // Convert server response type back to client format
    const serverToClientTypeMap: Record<string, string> = {
      'ALERT': 'alert',
      'WARNING': 'warning',
      'INFO': 'info',
      'SYSTEM': 'system',
    };

    return {
      ...response.data,
      type: (serverToClientTypeMap[response.data.type] || response.data.type.toLowerCase()) as any,
    };
  }

  async deleteNotificationTemplate(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Template ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(
      `/notification-templates/${id}`
    );
    return response.data;
  }

  // ============================================================================
  // Notifications API
  // ============================================================================

  async createNotification(
    createNotificationRequest: CreateNotificationRequest
  ): Promise<Notification> {
    const { userId, type, title, message } = createNotificationRequest;

    if (!userId) {
      throw new Error('User ID not provided');
    }

    if (!type) {
      throw new Error('Notification type not provided');
    }

    if (!title) {
      throw new Error('Notification title not provided');
    }

    if (!message) {
      throw new Error('Notification message not provided');
    }

    const response = await axiosInstance.post<Notification>('/notifications', createNotificationRequest);
    return response.data;
  }

  async createNotificationFromTemplate(
    createNotificationFromTemplateRequest: CreateNotificationFromTemplateRequest
  ): Promise<Notification> {
    const { userId, type } = createNotificationFromTemplateRequest;

    if (!userId) {
      throw new Error('User ID not provided');
    }

    if (!type) {
      throw new Error('Notification type not provided');
    }

    const response = await axiosInstance.post<Notification>(
      '/notifications/from-template',
      createNotificationFromTemplateRequest
    );
    return response.data;
  }

  async getUserNotifications(): Promise<Notification[]> {
    const response = await axiosInstance.get<Notification[]>('/notifications');
    return response.data;
  }

  async markNotificationsAsRead(
    markAsReadRequest: MarkAsReadRequest
  ): Promise<{ message?: string }> {
    const response = await axiosInstance.patch<{ message?: string }>(
      '/notifications/read',
      markAsReadRequest
    );
    return response.data;
  }

  async getNotificationById(id: string): Promise<Notification> {
    if (!id) {
      throw new Error('Notification ID not provided');
    }

    const response = await axiosInstance.get<Notification>(`/notifications/${id}`);
    return response.data;
  }

  // ============================================================================
  // Sensor Readings API
  // ============================================================================

  async getReadings(getReadingsQuery: GetReadingsQuery): Promise<SensorReading[]> {
    const { startTime, endTime } = getReadingsQuery;

    if (!startTime) {
      throw new Error('Start time not provided');
    }

    if (!endTime) {
      throw new Error('End time not provided');
    }

    const params: Record<string, unknown> = {};
    if (getReadingsQuery.sensorSerialNumber)
      params.sensorSerialNumber = getReadingsQuery.sensorSerialNumber;
    if (getReadingsQuery.stationId !== null && getReadingsQuery.stationId !== undefined)
      params.stationId = getReadingsQuery.stationId;
    if (getReadingsQuery.sensorType) params.sensorType = getReadingsQuery.sensorType;
    params.startTime = startTime;
    params.endTime = endTime;

    const response = await axiosInstance.get<any[]>('/sensor-readings', { params });
    // Convert server response to client SensorReading type
    return response.data.map((reading: any) => ({
      id: String(reading.id),
      sensorSerialNumber: reading.sensor?.serialNumber || reading.sensorSerialNumber || '',
      stationId: String(reading.sensor?.station?.id || reading.sensor?.stationId || reading.stationId || ''),
      sensorType: reading.sensor?.type || reading.sensorType,
      value: reading.value,
      unit: reading.unit || undefined,
      timestamp: reading.timestamp,
      quality: reading.quality !== null && reading.quality !== undefined
        ? (reading.quality >= 0.8 ? 'good' : reading.quality >= 0.5 ? 'fair' : 'poor')
        : undefined,
      metadata: {},
    }));
  }

  async getLatestReadings(
    sensorSerialNumber?: string,
    stationId?: string | null,
    limit: number = 10
  ): Promise<SensorReading[]> {
    if (!sensorSerialNumber && !stationId) {
      throw new Error('Either sensorSerialNumber or stationId must be provided');
    }

    const params: Record<string, unknown> = {};
    if (sensorSerialNumber) params.sensorSerialNumber = sensorSerialNumber;
    if (stationId !== null && stationId !== undefined) params.stationId = stationId;
    if (limit) params.limit = limit;

    const response = await axiosInstance.get<any[]>('/sensor-readings/latest', {
      params,
    });
    // Convert server response to client SensorReading type
    return response.data.map((reading: any) => ({
      id: String(reading.id),
      sensorSerialNumber: reading.sensor?.serialNumber || reading.sensorSerialNumber || '',
      stationId: String(reading.sensor?.station?.id || reading.sensor?.stationId || reading.stationId || ''),
      sensorType: reading.sensor?.type || reading.sensorType,
      value: reading.value,
      unit: reading.unit || undefined,
      timestamp: reading.timestamp,
      quality: reading.quality !== null && reading.quality !== undefined
        ? (reading.quality >= 0.8 ? 'good' : reading.quality >= 0.5 ? 'fair' : 'poor')
        : undefined,
      metadata: {},
    }));
  }

  async getAggregatedData(aggregationQuery: AggregationQuery): Promise<AggregatedData> {
    const { startTime, endTime } = aggregationQuery;

    if (!startTime) {
      throw new Error('Start time not provided');
    }

    if (!endTime) {
      throw new Error('End time not provided');
    }

    const params: Record<string, unknown> = {};
    if (aggregationQuery.sensorSerialNumber)
      params.sensorSerialNumber = aggregationQuery.sensorSerialNumber;
    if (aggregationQuery.stationId !== null && aggregationQuery.stationId !== undefined)
      params.stationId = aggregationQuery.stationId;
    if (aggregationQuery.sensorType) params.sensorType = aggregationQuery.sensorType;
    params.startTime = startTime;
    params.endTime = endTime;
    if (aggregationQuery.interval) {
      // Convert interval string to minutes for server
      const intervalMap: Record<string, number> = {
        hour: 60,
        day: 1440,
        week: 10080,
        month: 43200,
      };
      params.interval = intervalMap[aggregationQuery.interval] || 60;
    }

    const response = await axiosInstance.get<any[]>('/sensor-readings/aggregated', {
      params,
    });
    
    // Server returns array of aggregated data points
    // Convert to single AggregatedData object with all data points
    if (!response.data || response.data.length === 0) {
      return {
        interval: aggregationQuery.interval || 'hour',
        startTime: startTime,
        endTime: endTime,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        dataPoints: [],
      };
    }

    const dataPoints = response.data.map((item: any) => ({
      timestamp: item.time_bucket || item.timestamp,
      value: parseFloat(item.average) || 0,
    }));

    const allValues = response.data
      .flatMap((item: any) => [item.min, item.max, item.average])
      .filter((v: any) => v !== null && v !== undefined)
      .map((v: any) => parseFloat(v));

    const totalCount = response.data.reduce(
      (sum: number, item: any) => sum + (parseInt(item.sample_count) || 0),
      0
    );

    return {
      sensorSerialNumber: response.data[0]?.sensorSerialNumber,
      sensorType: response.data[0]?.sensorType,
      interval: aggregationQuery.interval || 'hour',
      startTime: startTime,
      endTime: endTime,
      average: allValues.length > 0
        ? allValues.reduce((sum, v) => sum + v, 0) / allValues.length
        : 0,
      min: allValues.length > 0 ? Math.min(...allValues) : 0,
      max: allValues.length > 0 ? Math.max(...allValues) : 0,
      count: totalCount,
      dataPoints: dataPoints,
    };
  }

  async validateDataQuality(
    sensorSerialNumber: string,
    hours: number = 24
  ): Promise<DataQualityReport> {
    if (!sensorSerialNumber) {
      throw new Error('Sensor serial number not provided');
    }

    const params: Record<string, unknown> = {};
    if (hours) params.hours = hours;

    const response = await axiosInstance.get<DataQualityReport>(
      `/sensor-readings/quality/${sensorSerialNumber}`,
      { params }
    );
    return response.data;
  }

  async processRawData(): Promise<{ message?: string }> {
    const response = await axiosInstance.post<{ message?: string }>(
      '/sensor-readings/process-raw-data'
    );
    return response.data;
  }

  // ============================================================================
  // Settings API
  // ============================================================================

  async getSettings(): Promise<Settings> {
    const response = await axiosInstance.get<Settings>('/settings');
    return response.data;
  }

  async updateSettings(updateSettingsRequest: UpdateSettingsRequest): Promise<Settings> {
    const response = await axiosInstance.patch<Settings>('/settings', updateSettingsRequest);
    return response.data;
  }

  // ============================================================================
  // Station Alert API
  // ============================================================================

  async getActiveAlerts(getAlertsQuery: GetAlertsQuery): Promise<StationAlert[]> {
    const params: Record<string, unknown> = {};
    if (getAlertsQuery.stationId !== null && getAlertsQuery.stationId !== undefined)
      params.stationId = getAlertsQuery.stationId;
    if (getAlertsQuery.sensorType) params.sensorType = getAlertsQuery.sensorType;
    if (getAlertsQuery.severity) params.severity = getAlertsQuery.severity;
    if (getAlertsQuery.isActive !== null && getAlertsQuery.isActive !== undefined)
      params.isActive = getAlertsQuery.isActive;
    if (getAlertsQuery.from) params.from = getAlertsQuery.from;
    if (getAlertsQuery.to) params.to = getAlertsQuery.to;
    if (getAlertsQuery.page) params.page = getAlertsQuery.page;
    if (getAlertsQuery.limit) params.limit = getAlertsQuery.limit;
    if (getAlertsQuery.sort) params.sort = getAlertsQuery.sort;

    const response = await axiosInstance.get<{ items: StationAlert[]; total: number; page: number; limit: number; totalPages: number }>('/station-alerts/active', { params });
    // API returns an object with items array, extract it
    return Array.isArray(response.data) ? response.data : (response.data.items || []);
  }

  async getAlertHistory(getAlertsQuery: GetAlertsQuery): Promise<StationAlert[]> {
    const params: Record<string, unknown> = {};
    if (getAlertsQuery.stationId !== null && getAlertsQuery.stationId !== undefined)
      params.stationId = getAlertsQuery.stationId;
    if (getAlertsQuery.sensorType) params.sensorType = getAlertsQuery.sensorType;
    if (getAlertsQuery.severity) params.severity = getAlertsQuery.severity;
    if (getAlertsQuery.isActive !== null && getAlertsQuery.isActive !== undefined)
      params.isActive = getAlertsQuery.isActive;
    if (getAlertsQuery.from) params.from = getAlertsQuery.from;
    if (getAlertsQuery.to) params.to = getAlertsQuery.to;
    if (getAlertsQuery.page) params.page = getAlertsQuery.page;
    if (getAlertsQuery.limit) params.limit = getAlertsQuery.limit;
    if (getAlertsQuery.sort) params.sort = getAlertsQuery.sort;

    const response = await axiosInstance.get<{ items: StationAlert[]; total: number; page: number; limit: number; totalPages: number }>('/station-alerts/history', {
      params,
    });
    // API returns an object with items array, extract it
    return Array.isArray(response.data) ? response.data : (response.data.items || []);
  }

  async acknowledgeAlert(id: string): Promise<StationAlert> {
    if (!id) {
      throw new Error('Alert ID not provided');
    }

    const response = await axiosInstance.patch<StationAlert>(`/station-alerts/${id}/acknowledge`);
    return response.data;
  }

  async clearAlertHistory(
    clearHistoryRequest: ClearHistoryRequest
  ): Promise<{ message?: string }> {
    const response = await axiosInstance.delete<{ message?: string }>(
      '/station-alerts/history',
      {
        data: clearHistoryRequest,
      }
    );
    return response.data;
  }

  // ============================================================================
  // System API
  // ============================================================================

  async createSystemEvent(
    createSystemEventRequest: CreateSystemEventRequest
  ): Promise<SystemEvent> {
    const { type, message } = createSystemEventRequest;

    if (!type) {
      throw new Error('Event type not provided');
    }

    if (!message) {
      throw new Error('Event message not provided');
    }

    const response = await axiosInstance.post<SystemEvent>(
      '/system/events',
      createSystemEventRequest
    );
    return response.data;
  }

  async getAllSystemEvents(
    type?: SystemEventType,
    source?: SystemEventSource,
    startDate?: string,
    endDate?: string,
    limit?: number | null
  ): Promise<SystemEvent[]> {
    const params: Record<string, unknown> = {};
    if (type) params.type = type;
    if (source) params.source = source;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit !== null && limit !== undefined) params.limit = limit;

    const response = await axiosInstance.get<any[]>('/system/events', { params });
    // Convert server response to client SystemEvent type
    return response.data.map((event: any) => ({
      id: String(event.id),
      type: event.type,
      source: event.source,
      message: event.message,
      metadata: event.details || event.metadata || {},
      createdAt: event.createdAt,
    }));
  }

  async getSystemEventSummary(limit?: number | null): Promise<SystemEventSummary> {
    const params: Record<string, unknown> = {};
    if (limit !== null && limit !== undefined) params.limit = limit;

    const response = await axiosInstance.get<SystemEventSummary>('/system/events/summary', {
      params,
    });
    return response.data;
  }

  async getSystemEventById(id: string): Promise<SystemEvent> {
    if (!id) {
      throw new Error('Event ID not provided');
    }

    const response = await axiosInstance.get<any>(`/system/events/${id}`);
    // Convert server response to client SystemEvent type
    return {
      id: String(response.data.id),
      type: response.data.type,
      source: response.data.source,
      message: response.data.message,
      metadata: response.data.details || response.data.metadata || {},
      createdAt: response.data.createdAt,
    };
  }

  async deleteSystemEvent(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Event ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/system/events/${id}`);
    return response.data;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await axiosInstance.get<SystemHealth>('/system/health');
    return response.data;
  }

  async getSystemStatistics(timeRange?: string): Promise<SystemStatistics> {
    const params: Record<string, unknown> = {};
    if (timeRange) params.timeRange = timeRange;

    const response = await axiosInstance.get<SystemStatistics>('/system/statistics', { params });
    return response.data;
  }

  async cleanupOldSystemEvents(daysToKeep?: number | null): Promise<{ message?: string }> {
    const params: Record<string, unknown> = {};
    if (daysToKeep !== null && daysToKeep !== undefined) params.daysToKeep = daysToKeep;

    const response = await axiosInstance.delete<{ message?: string }>(
      '/system/events/cleanup/old',
      { params }
    );
    return response.data;
  }

  async getDashboardData(): Promise<DashboardData> {
    const response = await axiosInstance.get<any>('/system/dashboard');
    // Server returns { health, statistics, eventSummary, timestamp }
    // Client expects DashboardData structure, so we adapt it
    return {
      systemHealth: {
        status: response.data.health?.status || 'unknown',
        uptime: response.data.health?.uptime || 0,
        database: response.data.health?.checks?.database?.status === 'healthy' ? 'connected' : 'disconnected',
        sensors: {
          total: 0,
          active: 0,
          inactive: 0,
        },
        version: undefined,
      },
      recentAlerts: [],
      recentEvents: response.data.eventSummary?.recent || [],
      statistics: {
        timeRange: response.data.statistics?.timeRange || 'day',
        totalReadings: 0,
        activeStations: 0,
        activeSensors: 0,
        alerts: {
          active: 0,
          resolved: 0,
        },
        users: {
          total: response.data.statistics?.statistics?.users?.total || 0,
          active: 0,
        },
      },
      stationStatuses: [],
    } as DashboardData;
  }

  // ============================================================================
  // Threshold API
  // ============================================================================

  async createThreshold(createThresholdRequest: CreateThresholdRequest): Promise<Threshold> {
    const { sensorType, severity } = createThresholdRequest;

    if (!sensorType) {
      throw new Error('Sensor type not provided');
    }

    if (!severity) {
      throw new Error('Severity not provided');
    }

    const response = await axiosInstance.post<Threshold>('/threshold', createThresholdRequest);
    return response.data;
  }

  async getAllThresholds(): Promise<Threshold[]> {
    const response = await axiosInstance.get<Threshold[]>('/threshold');
    return response.data;
  }

  async getThresholdById(id: string): Promise<Threshold> {
    if (!id) {
      throw new Error('Threshold ID not provided');
    }

    const response = await axiosInstance.get<Threshold>(`/threshold/${id}`);
    return response.data;
  }

  async getThresholdsBySensorType(sensorType: SensorType): Promise<Threshold[]> {
    if (!sensorType) {
      throw new Error('Sensor type not provided');
    }

    const response = await axiosInstance.get<Threshold[]>(
      `/threshold/sensor-type/${sensorType}`
    );
    return response.data;
  }

  async updateThreshold(
    id: string,
    updateThresholdRequest: UpdateThresholdRequest
  ): Promise<Threshold> {
    if (!id) {
      throw new Error('Threshold ID not provided');
    }

    const response = await axiosInstance.patch<Threshold>(`/threshold/${id}`, updateThresholdRequest);
    return response.data;
  }

  async activateThreshold(id: string): Promise<Threshold> {
    if (!id) {
      throw new Error('Threshold ID not provided');
    }

    const response = await axiosInstance.patch<Threshold>(`/threshold/${id}/activate`);
    return response.data;
  }

  async deactivateThreshold(id: string): Promise<Threshold> {
    if (!id) {
      throw new Error('Threshold ID not provided');
    }

    const response = await axiosInstance.patch<Threshold>(`/threshold/${id}/deactivate`);
    return response.data;
  }

  async deleteThreshold(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Threshold ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/threshold/${id}`);
    return response.data;
  }

  async validateReading(
    sensorType: SensorType,
    value: number
  ): Promise<ValidateReadingResponse> {
    if (!sensorType) {
      throw new Error('Sensor type not provided');
    }

    if (value === null || value === undefined) {
      throw new Error('Value not provided');
    }

    // Server expects value in request body
    const response = await axiosInstance.post<ValidateReadingResponse>(
      `/threshold/validate-reading/${sensorType}`,
      { value }
    );
    return response.data;
  }

  // ============================================================================
  // User API
  // ============================================================================

  async getAllUsers(): Promise<User[]> {
    const response = await axiosInstance.get<User[]>('/user');
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    if (!id) {
      throw new Error('User ID not provided');
    }

    const response = await axiosInstance.get<User>(`/user/${id}`);
    return response.data;
  }

  async deleteUser(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('User ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(`/user/${id}`);
    return response.data;
  }

  async blockUser(id: string): Promise<User> {
    if (!id) {
      throw new Error('User ID not provided');
    }

    const response = await axiosInstance.patch<User>(`/user/block/${id}`);
    return response.data;
  }

  async unblockUser(id: string): Promise<User> {
    if (!id) {
      throw new Error('User ID not provided');
    }

    const response = await axiosInstance.patch<User>(`/user/unblock/${id}`);
    return response.data;
  }

  async getUserByEmail(email: string): Promise<User> {
    if (!email) {
      throw new Error('Email not provided');
    }

    // Note: Server uses GET with @Body() which is non-standard
    // Using POST as workaround since GET requests shouldn't have body
    const response = await axiosInstance.post<User>('/user/email', { email });
    return response.data;
  }

  async changeUserRole(changeUserRoleRequest: ChangeUserRoleRequest): Promise<User> {
    const { id, role } = changeUserRoleRequest;

    if (!id) {
      throw new Error('User ID not provided');
    }

    if (!role) {
      throw new Error('Role not provided');
    }

    // Convert lowercase UserRole to uppercase Role enum that server expects
    const roleMap: Record<string, string> = {
      'admin': 'ADMIN',
      'operator': 'OPERATOR',
      'viewer': 'OBSERVER',
      'user': 'OBSERVER', // Default user role maps to OBSERVER
    };

    const serverRole = roleMap[role.toLowerCase()] || role.toUpperCase();

    const response = await axiosInstance.post<User>('/user/role', {
      id: parseInt(id),
      role: serverRole,
    });
    return response.data;
  }

  async updateProfile(updateProfileRequest: UpdateProfileRequest): Promise<User> {
    const response = await axiosInstance.patch<User>('/user/profile', updateProfileRequest);
    return response.data;
  }

  // ============================================================================
  // User Activity Log API
  // ============================================================================

  async createUserActivityLog(
    createUserActivityLogRequest: CreateUserActivityLogRequest
  ): Promise<UserActivityLog> {
    const { userId, action } = createUserActivityLogRequest;

    if (!userId) {
      throw new Error('User ID not provided');
    }

    if (!action) {
      throw new Error('Action not provided');
    }

    const response = await axiosInstance.post<UserActivityLog>(
      '/user-activity-logs',
      createUserActivityLogRequest
    );
    return response.data;
  }

  async getAllUserActivityLogs(): Promise<UserActivityLog[]> {
    const response = await axiosInstance.get<UserActivityLog[]>('/user-activity-logs');
    return response.data;
  }

  async getUserActivityLogsByUserId(userId: string): Promise<UserActivityLog[]> {
    if (!userId) {
      throw new Error('User ID not provided');
    }

    const response = await axiosInstance.get<UserActivityLog[]>(
      `/user-activity-logs/user/${userId}`
    );
    return response.data;
  }

  async getUserActivityLogById(id: string): Promise<UserActivityLog> {
    if (!id) {
      throw new Error('Log ID not provided');
    }

    const response = await axiosInstance.get<UserActivityLog>(`/user-activity-logs/${id}`);
    return response.data;
  }

  async deleteUserActivityLog(id: string): Promise<{ message?: string }> {
    if (!id) {
      throw new Error('Log ID not provided');
    }

    const response = await axiosInstance.delete<{ message?: string }>(
      `/user-activity-logs/${id}`
    );
    return response.data;
  }

  async cleanupOldUserActivityLogs(): Promise<{ message?: string }> {
    const response = await axiosInstance.delete<{ message?: string }>(
      '/user-activity-logs/cleanup/old'
    );
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

