import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorReadingDto } from './dto/create-sensor-reading.dto';
import { GetReadingsQueryDto } from './dto/get-readings-query.dto';
import { AggregationQueryDto } from './dto/aggregation-query.dto';
import { ThresholdService } from '../threshold/threshold.service';
import { SensorType, AlertSeverity, SensorReading, Sensor, MonitoringStation } from '@prisma/client';
import { SensorReadingResponseDto } from './dto/sensor-reading-response.dto';
import {StationAlertService} from "../station-alert/station-alert.service";
import {CreateAlertInternalDto} from "../station-alert/dto/create-alert-internal.dto";

interface DataGap {
    before: Date;
    after: Date;
    duration: number;
}

interface Anomaly {
    index: number;
    value: number;
    timestamp: Date;
}

@Injectable()
export class SensorReadingsService {
    private readonly logger = new Logger(SensorReadingsService.name);

    constructor(
        private prisma: PrismaService,
        private thresholdService: ThresholdService,
        private stationAlertService: StationAlertService,
    ) {}

    /**
     * Find sensor by serial number with proper error handling
     */
    private async findSensorBySerialNumber(serialNumber: string) {
        const sensor = await this.prisma.sensor.findFirst({
            where: {
                serialNumber,
                isActive: true,
            },
            include: {
                station: true,
            },
        });

        if (!sensor) {
            throw new NotFoundException(`Sensor with serial number '${serialNumber}' not found or inactive`);
        }

        return sensor;
    }

    /**
     * Convert Prisma reading to response DTO
     */
    private toResponseDto(reading: any, thresholdViolations?: any[]): SensorReadingResponseDto {
        return {
            id: reading.id,
            sensorId: reading.sensorId,
            value: reading.value,
            unit: reading.unit,
            timestamp: reading.timestamp,
            quality: reading.quality,
            sensor: {
                id: reading.sensor.id,
                serialNumber: reading.sensor.serialNumber,
                type: reading.sensor.type,
                name: reading.sensor.name,
                station: {
                    id: reading.sensor.station.id,
                    name: reading.sensor.station.name,
                },
            },
            thresholdViolations: thresholdViolations,
        };
    }

    /**
     * Create a new sensor reading with data validation and quality assessment
     */
    async createReading(createSensorReadingDto: CreateSensorReadingDto): Promise<SensorReadingResponseDto> {
        try {
            // Find sensor by serial number
            const sensor = await this.findSensorBySerialNumber(createSensorReadingDto.sensorSerialNumber);

            // Validate reading against thresholds
            const thresholdViolations = await this.thresholdService.validateSensorReading(
                sensor.type,
                createSensorReadingDto.value
            );

            // Calculate data quality (1.0 - severity weight of violations)
            let quality = createSensorReadingDto.quality || 1.0;
            if (thresholdViolations.length > 0) {
                const maxSeverity = Math.max(
                    ...thresholdViolations.map(v => this.getSeverityWeight(v.severity))
                );
                quality = Math.max(0, 1.0 - maxSeverity);
            }

            // Create the reading
            const reading = await this.prisma.sensorReading.create({
                data: {
                    sensorId: sensor.id,
                    value: createSensorReadingDto.value,
                    unit: createSensorReadingDto.unit,
                    timestamp: createSensorReadingDto.timestamp || new Date(),
                    quality: quality,
                },
                include: {
                    sensor: {
                        include: {
                            station: true,
                        },
                    },
                },
            });

            // Create alerts for threshold violations using StationAlertService
            if (thresholdViolations.length > 0) {
                await this.createThresholdAlerts(reading, thresholdViolations, sensor.type);
            }

            this.logger.log(`Created reading for sensor ${sensor.serialNumber} with value ${reading.value}`);
            await this.processRawSensorData()
            return this.toResponseDto(reading, thresholdViolations.length > 0 ? thresholdViolations : undefined);

        } catch (error) {
            this.logger.error(`Failed to create sensor reading: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get sensor readings for a specific time period
     */
    async getReadings(query: GetReadingsQueryDto): Promise<SensorReadingResponseDto[]> {
        try {
            const { sensorSerialNumber, stationId, sensorType, startTime, endTime } = query;

            // Логирование входящего запроса
            this.logger.log(`📥 Incoming getReadings request with parameters:`, {
                sensorSerialNumber,
                stationId,
                sensorType,
                startTime,
                endTime,
                timestamp: new Date().toISOString()
            });

            // Convert ISO 8601 strings to Date objects
            const startTimeDate = new Date(startTime);
            const endTimeDate = new Date(endTime);

            // Логирование конвертации дат
            this.logger.log(`📅 Date conversion results:`, {
                originalStartTime: startTime,
                convertedStartTime: startTimeDate.toISOString(),
                startTimeValid: !isNaN(startTimeDate.getTime()),
                originalEndTime: endTime,
                convertedEndTime: endTimeDate.toISOString(),
                endTimeValid: !isNaN(endTimeDate.getTime()),
                timezoneOffsetStart: startTimeDate.getTimezoneOffset(),
                timezoneOffsetEnd: endTimeDate.getTimezoneOffset()
            });

            if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
                this.logger.error(`❌ Invalid date format: startTime=${startTime}, endTime=${endTime}`);
                throw new BadRequestException('Invalid date format. Dates must be valid ISO 8601 strings');
            }

            if (startTimeDate >= endTimeDate) {
                this.logger.error(`❌ Invalid date range: startTime=${startTimeDate.toISOString()} >= endTime=${endTimeDate.toISOString()}`);
                throw new BadRequestException('Start time must be before end time');
            }

            const whereCondition: any = {
                timestamp: {
                    gte: startTimeDate,
                    lte: endTimeDate,
                },
            };

            // Логирование базового условия where
            this.logger.log(`🔍 Base WHERE condition:`, {
                timestamp: {
                    gte: whereCondition.timestamp.gte.toISOString(),
                    lte: whereCondition.timestamp.lte.toISOString()
                }
            });

            if (sensorSerialNumber && sensorSerialNumber !== 'All sensors' && sensorSerialNumber !== 'All+sensors') {
                this.logger.log(`🔎 Looking for sensor by serial number: "${sensorSerialNumber}"`);

                // Find sensor by serial number - don't filter by isActive to allow reading history
                const sensor = await this.prisma.sensor.findFirst({
                    where: {
                        serialNumber: sensorSerialNumber,
                    },
                    include: {
                        station: true,
                    },
                });

                if (!sensor) {
                    this.logger.error(`❌ Sensor not found with serial number: "${sensorSerialNumber}"`);

                    // Проверим, какие сенсоры вообще есть в базе данных
                    const allSensors = await this.prisma.sensor.findMany({
                        select: { serialNumber: true, id: true, name: true },
                        take: 10
                    });
                    this.logger.log(`📋 First 10 sensors in DB:`, allSensors);

                    throw new NotFoundException(`Sensor with serial number '${sensorSerialNumber}' not found`);
                }

                this.logger.log(`✅ Found sensor:`, {
                    id: sensor.id,
                    name: sensor.name,
                    serialNumber: sensor.serialNumber,
                    type: sensor.type,
                    stationId: sensor.stationId
                });

                whereCondition.sensorId = sensor.id;

                // Проверим, есть ли вообще записи для этого sensorId без учета времени
                const allReadingsForSensor = await this.prisma.sensorReading.count({
                    where: { sensorId: sensor.id }
                });
                this.logger.log(`📊 Total readings count for sensor ID ${sensor.id}: ${allReadingsForSensor}`);

                this.logger.log(`📝 Final WHERE condition with sensor ID:`, whereCondition);

            } else if (stationId || sensorType) {
                this.logger.log(`🔎 Filtering by stationId=${stationId}, sensorType=${sensorType}`);
                whereCondition.sensor = {};

                if (stationId) {
                    whereCondition.sensor.stationId = stationId;
                }

                if (sensorType) {
                    whereCondition.sensor.type = sensorType;
                }

                this.logger.log(`📝 Final WHERE condition with station/sensorType:`, whereCondition);
            } else {
                this.logger.warn(`⚠️ No specific filter provided - querying all sensors`);
            }

            // Проверим SQL запрос, который будет выполнен
            const readings = await this.prisma.sensorReading.findMany({
                where: whereCondition,
                include: {
                    sensor: {
                        include: {
                            station: true,
                        },
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });

            // Подробное логирование результатов
            this.logger.log(`📊 Query execution details:`, {
                foundReadings: readings.length,
                timeRange: `${startTimeDate.toISOString()} - ${endTimeDate.toISOString()}`,
                sensorSerialNumber,
                whereCondition: JSON.stringify(whereCondition, null, 2)
            });

            if (readings.length === 0) {
                this.logger.warn(`⚠️ No readings found. Additional diagnostics:`);

                // Проверим, есть ли записи в этом диапазоне без фильтра по сенсору
                const anyReadingsInRange = await this.prisma.sensorReading.findMany({
                    where: {
                        timestamp: {
                            gte: startTimeDate,
                            lte: endTimeDate,
                        },
                    },
                    take: 5,
                    orderBy: { timestamp: 'desc' },
                    include: { sensor: true }
                });

                this.logger.log(`🔍 First 5 readings in time range (any sensor):`, {
                    count: anyReadingsInRange.length,
                    readings: anyReadingsInRange.map(r => ({
                        id: r.id,
                        timestamp: r.timestamp.toISOString(),
                        value: r.value,
                        sensorId: r.sensorId,
                        sensorSerialNumber: r.sensor?.serialNumber
                    }))
                });

                // Проверим крайние даты в базе данных
                const oldestReading = await this.prisma.sensorReading.findFirst({
                    orderBy: { timestamp: 'asc' },
                    include: { sensor: true }
                });

                const newestReading = await this.prisma.sensorReading.findFirst({
                    orderBy: { timestamp: 'desc' },
                    include: { sensor: true }
                });

                this.logger.log(`📅 Database time range:`, {
                    oldest: oldestReading ? oldestReading.timestamp.toISOString() : 'No readings',
                    newest: newestReading ? newestReading.timestamp.toISOString() : 'No readings',
                    sensorOfOldest: oldestReading?.sensor?.serialNumber,
                    sensorOfNewest: newestReading?.sensor?.serialNumber
                });

                // Если есть sensorSerialNumber, проверим записи конкретно для этого сенсора
                if (sensorSerialNumber && sensorSerialNumber !== 'All sensors' && sensorSerialNumber !== 'All+sensors') {
                    const sensor = await this.prisma.sensor.findFirst({
                        where: { serialNumber: sensorSerialNumber }
                    });

                    if (sensor) {
                        const sensorReadingsAnyTime = await this.prisma.sensorReading.findMany({
                            where: { sensorId: sensor.id },
                            take: 5,
                            orderBy: { timestamp: 'desc' },
                            include: { sensor: true }
                        });

                        this.logger.log(`🔍 Recent readings for sensor "${sensorSerialNumber}" (any time):`, {
                            count: sensorReadingsAnyTime.length,
                            readings: sensorReadingsAnyTime.map(r => ({
                                id: r.id,
                                timestamp: r.timestamp.toISOString(),
                                value: r.value
                            }))
                        });
                    }
                }
            } else {
                this.logger.log(`✅ Sample of found readings (first 3):`, readings.slice(0, 3).map(r => ({
                    id: r.id,
                    timestamp: r.timestamp.toISOString(),
                    value: r.value,
                    sensorId: r.sensorId,
                    sensor: {
                        serialNumber: r.sensor.serialNumber,
                        type: r.sensor.type
                    }
                })));
            }

            return readings.map(reading => this.toResponseDto(reading));
        } catch (error) {
            this.logger.error(`💥 Failed to get readings: ${error.message}`, error.stack);
            this.logger.error(`📋 Error context:`, {
                query: JSON.stringify(query, null, 2),
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Get latest readings for a sensor or station
     */
    async getLatestReadings(sensorSerialNumber?: string, stationId?: number, limit: number = 10): Promise<SensorReadingResponseDto[]> {
        try {
            if (!sensorSerialNumber && !stationId) {
                throw new BadRequestException('Either sensorSerialNumber or stationId must be provided');
            }

            let query: any;

            if (sensorSerialNumber) {
                // Find sensor by serial number first
                const sensor = await this.findSensorBySerialNumber(sensorSerialNumber);

                // Get latest readings for specific sensor
                query = {
                    where: { sensorId: sensor.id },
                    orderBy: { timestamp: 'desc' },
                    take: limit,
                    include: {
                        sensor: {
                            include: {
                                station: true,
                            },
                        },
                    },
                };
            } else {
                // Get latest readings for all sensors in station
                query = {
                    where: {
                        sensor: {
                            stationId: stationId,
                        },
                    },
                    orderBy: [
                        { sensorId: 'asc' },
                        { timestamp: 'desc' },
                    ],
                    include: {
                        sensor: {
                            include: {
                                station: true,
                            },
                        },
                    },
                };
            }

            const readings = await this.prisma.sensorReading.findMany(query);

            // For station query, we need to get only the latest reading per sensor
            let resultReadings = readings;
            if (stationId && !sensorSerialNumber) {
                const latestBySensor = new Map();
                readings.forEach(reading => {
                    if (!latestBySensor.has(reading.sensorId)) {
                        latestBySensor.set(reading.sensorId, reading);
                    }
                });
                resultReadings = Array.from(latestBySensor.values());
            }

            return resultReadings.map(reading => this.toResponseDto(reading));
        } catch (error) {
            this.logger.error(`Failed to get latest readings: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get aggregated data (average, min, max) for a period
     */
    async getAggregatedData(query: AggregationQueryDto) {
        try {
            const { sensorSerialNumber, stationId, sensorType, startTime, endTime, interval } = query;

            // Convert ISO 8601 strings to Date objects
            const startTimeDate = new Date(startTime);
            const endTimeDate = new Date(endTime);

            if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
                throw new BadRequestException('Invalid date format. Dates must be valid ISO 8601 strings');
            }

            if (startTimeDate >= endTimeDate) {
                throw new BadRequestException('Start time must be before end time');
            }

            let sensorId: number | undefined;

            if (sensorSerialNumber && sensorSerialNumber !== 'All sensors' && sensorSerialNumber !== 'All+sensors') {
                const sensor = await this.prisma.sensor.findFirst({
                    where: {
                        serialNumber: sensorSerialNumber,
                    },
                });
                if (sensor) {
                    sensorId = sensor.id;
                }
            }

            // Build WHERE conditions dynamically
            let whereClause = `WHERE sr.timestamp >= '${startTimeDate.toISOString()}' AND sr.timestamp <= '${endTimeDate.toISOString()}'`;

            if (sensorId) {
                whereClause += ` AND sr."sensorId" = ${sensorId}`;
            }

            if (stationId) {
                whereClause += ` AND s."stationId" = ${stationId}`;
            }

            if (sensorType) {
                whereClause += ` AND s.type = '${sensorType}'`;
            }

            const sqlQuery = `
        SELECT
          s."serialNumber" as "sensorSerialNumber",
          s.type as "sensorType",
          DATE_TRUNC('hour', sr.timestamp) as time_bucket,
          AVG(sr.value) as average,
          MIN(sr.value) as min,
          MAX(sr.value) as max,
          COUNT(*) as sample_count
        FROM sensor_readings sr
        JOIN sensors s ON sr."sensorId" = s.id
        ${whereClause}
        GROUP BY s."serialNumber", s.type, time_bucket
        ORDER BY time_bucket ASC
      `;

            const result = await this.prisma.$queryRawUnsafe(sqlQuery);
            return result;
        } catch (error) {
            this.logger.error(`Failed to get aggregated data: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Validate data quality based on multiple factors
     */
    async validateDataQuality(sensorSerialNumber: string, hours: number = 24) {
        try {
            const sensor = await this.findSensorBySerialNumber(sensorSerialNumber);
            const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

            const readings = await this.prisma.sensorReading.findMany({
                where: {
                    sensorId: sensor.id,
                    timestamp: {
                        gte: startTime,
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });

            if (readings.length === 0) {
                return {
                    isValid: false,
                    score: 0,
                    issues: ['No data available for the specified period'],
                };
            }

            const issues: string[] = [];
            let qualityScore = 0;

            // Check for data gaps
            const gaps: DataGap[] = this.detectDataGaps(readings);
            if (gaps.length > 0) {
                issues.push(`Found ${gaps.length} data gaps in the time series`);
                qualityScore -= gaps.length * 0.1;
            }

            // Check for stale data
            const lastReading = readings[readings.length - 1];
            const timeSinceLastReading = Date.now() - lastReading.timestamp.getTime();
            const staleThreshold = 2 * 60 * 60 * 1000; // 2 hours

            if (timeSinceLastReading > staleThreshold) {
                issues.push('Data appears to be stale');
                qualityScore -= 0.3;
            }

            // Calculate average quality from readings
            const avgQuality = readings.reduce((sum, reading) => sum + (reading.quality || 0), 0) / readings.length;
            qualityScore += avgQuality;

            // Check for anomalous patterns (simple version)
            const anomalies: Anomaly[] = this.detectAnomalies(readings);
            if (anomalies.length > 0) {
                issues.push(`Detected ${anomalies.length} potential anomalies`);
                qualityScore -= anomalies.length * 0.05;
            }

            const finalScore = Math.max(0, Math.min(1, qualityScore));

            return {
                isValid: finalScore >= 0.7,
                score: finalScore,
                issues: issues.length > 0 ? issues : ['No quality issues detected'],
                readingsCount: readings.length,
                period: {
                    start: startTime,
                    end: new Date(),
                },
                sensor: {
                    serialNumber: sensor.serialNumber,
                    type: sensor.type,
                    name: sensor.name,
                },
            };
        } catch (error) {
            this.logger.error(`Failed to validate data quality: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Process raw sensor data and convert to structured readings
     */
    async processRawSensorData(): Promise<SensorReadingResponseDto[]> {
        try {
            const unprocessedData = await this.prisma.rawSensorData.findMany({
                where: {
                    processed: false,
                },
                include: {
                    sensor: true,
                },
                take: 100, // Process in batches
            });

            const processedReadings: SensorReadingResponseDto[] = [];

            for (const rawData of unprocessedData) {
                try {
                    // Extract values from raw payload
                    const reading = this.extractReadingFromPayload(rawData.rawPayload, rawData.sensor);

                    if (reading) {
                        const createdReading = await this.createReading({
                            sensorSerialNumber: rawData.sensor.serialNumber,
                            value: reading.value,
                            unit: reading.unit,
                            timestamp: rawData.receivedAt,
                            quality: reading.quality,
                        });

                        processedReadings.push(createdReading);

                        // Mark as processed
                        await this.prisma.rawSensorData.update({
                            where: { id: rawData.id },
                            data: { processed: true },
                        });
                    }
                } catch (error) {
                    this.logger.error(`Failed to process raw data ${rawData.id}: ${error.message}`);
                    // Optionally mark as processed with error flag or leave for retry
                }
            }

            this.logger.log(`Processed ${processedReadings.length} raw sensor data entries`);
            return processedReadings;
        } catch (error) {
            this.logger.error(`Failed to process raw sensor data: ${error.message}`, error.stack);
            throw error;
        }
    }

    // Private helper methods

    private getSeverityWeight(severity: AlertSeverity): number {
        const weights = {
            [AlertSeverity.LOW]: 0.1,
            [AlertSeverity.MEDIUM]: 0.3,
            [AlertSeverity.HIGH]: 0.6,
            [AlertSeverity.CRITICAL]: 1.0,
        };
        return weights[severity] || 0;
    }

    /**
     * Create threshold alerts using StationAlertService with deduplication
     */
    private async createThresholdAlerts(reading: any, violations: any[], sensorType: SensorType) {
        for (const violation of violations) {
            try {
                // Determine which threshold value was exceeded
                const thresholdValue = this.getExceededThresholdValue(violation, reading.value);

                // Generate descriptive message
                const message = this.generateAlertMessage(violation, reading.value, sensorType);

                const alertPayload: CreateAlertInternalDto = {
                    stationId: reading.sensor.stationId,
                    sensorId: reading.sensorId,
                    sensorType: sensorType,
                    value: reading.value,
                    thresholdValue: thresholdValue,
                    severity: violation.severity,
                    message: message,
                };

                await this.stationAlertService.createAlertIfThresholdExceeded(alertPayload);

                this.logger.log(`Created alert for sensor ${reading.sensor.serialNumber} with severity ${violation.severity}`);
            } catch (error) {
                this.logger.error(`Failed to create alert for violation: ${error.message}`, error.stack);
            }
        }
    }

    /**
     * Determine which threshold value was exceeded and return it
     */
    private getExceededThresholdValue(violation: any, actualValue: number): number {
        if (violation.minValue !== null && actualValue < violation.minValue) {
            return violation.minValue;
        }
        if (violation.maxValue !== null && actualValue > violation.maxValue) {
            return violation.maxValue;
        }
        // Fallback - should not happen if violation is valid
        return violation.minValue ?? violation.maxValue ?? actualValue;
    }

    /**
     * Generate descriptive alert message
     */
    private generateAlertMessage(violation: any, actualValue: number, sensorType: SensorType): string {
        const sensorTypeName = sensorType.toLowerCase().replace('_', ' ');

        if (violation.minValue !== null && actualValue < violation.minValue) {
            return `Sensor ${sensorTypeName} reading ${actualValue} is below minimum threshold ${violation.minValue}. ${violation.description || ''}`.trim();
        }

        if (violation.maxValue !== null && actualValue > violation.maxValue) {
            return `Sensor ${sensorTypeName} reading ${actualValue} is above maximum threshold ${violation.maxValue}. ${violation.description || ''}`.trim();
        }

        return `Sensor ${sensorTypeName} reading ${actualValue} exceeded threshold. ${violation.description || ''}`.trim();
    }

    private detectDataGaps(readings: SensorReading[]): DataGap[] {
        const gaps: DataGap[] = [];
        for (let i = 1; i < readings.length; i++) {
            const timeDiff = readings[i].timestamp.getTime() - readings[i - 1].timestamp.getTime();
            // Consider gaps larger than 2 hours as significant
            if (timeDiff > 2 * 60 * 60 * 1000) {
                gaps.push({
                    before: readings[i - 1].timestamp,
                    after: readings[i].timestamp,
                    duration: timeDiff,
                });
            }
        }
        return gaps;
    }

    private detectAnomalies(readings: SensorReading[]): Anomaly[] {
        // Simple anomaly detection based on standard deviation
        const values = readings.map(r => r.value);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);

        const anomalies: Anomaly[] = [];
        readings.forEach((reading, index) => {
            if (Math.abs(reading.value - mean) > 3 * stdDev) {
                anomalies.push({
                    index,
                    value: reading.value,
                    timestamp: reading.timestamp,
                });
            }
        });

        return anomalies;
    }

    private extractReadingFromPayload(payload: any, sensor: any) {
        // Implement based on your specific sensor data format
        try {
            if (payload.value !== undefined) {
                return {
                    value: parseFloat(payload.value),
                    unit: payload.unit || this.getDefaultUnit(sensor.type),
                    quality: payload.quality || 1.0,
                };
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to extract reading from payload: ${error.message}`);
            return null;
        }
    }

    private getDefaultUnit(sensorType: SensorType): string {
        const units = {
            [SensorType.TEMPERATURE]: '°C',
            [SensorType.HUMIDITY]: '%',
            [SensorType.CO2]: 'ppm',
            [SensorType.AIR_QUALITY]: 'AQI',
            [SensorType.PM2_5]: 'µg/m³',
            [SensorType.PM10]: 'µg/m³',
            [SensorType.PRESSURE]: 'hPa',
            [SensorType.NOISE]: 'dB',
            [SensorType.WATER_QUALITY]: 'NTU',
        };
        return units[sensorType] || 'unit';
    }
}